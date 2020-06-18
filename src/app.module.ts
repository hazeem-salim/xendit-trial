import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';

// entities
import { Notification } from './entities/notification.entity'
import { Callback } from './entities/callback.entity'
import { Payload } from './entities/payload.entity'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'notificationapp',
      password: 'password',
      database: 'xendit',
      entities: [ Notification, Callback, Payload ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([ Notification ])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
