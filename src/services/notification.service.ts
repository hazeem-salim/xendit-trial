import axios from 'axios'
import {
  Injectable,
  InternalServerErrorException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Notification } from '../entities/notification.entity'
import { Callback } from '../entities/callback.entity'
import { NotifyDto } from '../dtos/notify.dto'
import { SqsService } from './sqs.service';

@Injectable()
export class NotificationService {
  public static readonly PENDING = 'PENDING'
  public static readonly ACKNOWLEDGED = 'ACKNOWLEDGED'

  private static readonly FIFTEEN_MINS = 1000

  constructor(
    @InjectRepository(Callback) private callbackRepository: Repository<Callback>,
    @InjectRepository(Notification) private notificationRepository: Repository<Notification>,
    private readonly sqsService: SqsService
  ) {}

  async createAndSendNotification(notifyDto: NotifyDto): Promise<void> {
    try {
      const callback = await this.callbackRepository.findOne({
        accountId: notifyDto.accountId,
        type: notifyDto.type
      })
      const notification = await this.notificationRepository.save({
        callbackId: callback.id,
        paymentId: notifyDto.paymentId,
        tries: 1,
        status: NotificationService.PENDING,
        payload: JSON.stringify(notifyDto.payload)
      })

      const sent = await this.sendNotification(
        callback.callbackUrl,
        notifyDto.payload,
        callback.callbackToken
      )
      if (sent) {
        this.updateNotificationStatus(notification.id, NotificationService.ACKNOWLEDGED)
      } else {
        this.pushToRetryQueue(notification.id)
      }
    } catch(error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  private async sendNotification(
    callbackUrl: string,
    payload: object,
    callbackToken: string
  ): Promise<boolean> {
    try {
      const res = await axios.post(callbackUrl, payload, {
        headers: {
          'X-Callback-Token': callbackToken
        },
        timeout: 2000
      })
      return res.status === 200
    } catch(error) {
      return false
    }
  }

  private pushToRetryQueue(notificationId) {
    setTimeout(() => {
      this.sqsService.sendMessage({
        notificationId
      })
    }, NotificationService.FIFTEEN_MINS)
  }

  async updateNotificationStatus(id: number, status: string) {
    this.notificationRepository.update(id, {
      status
    })
  }
}
