import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Convite } from './entities/convite.entity';
import { Convidado } from './entities/convidado.entity';
import { RsvpService } from './rsvp.service';
import { RateLimiterService } from './rate-limiter.service';
import { RsvpController, AdminRsvpController } from './rsvp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Convite, Convidado])],
  providers: [RsvpService, RateLimiterService],
  controllers: [RsvpController, AdminRsvpController],
})
export class RsvpModule {}
