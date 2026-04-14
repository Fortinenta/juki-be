import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  Query,
  Param,
} from '@nestjs/common';
import { FeedbacksService } from './feedbacks.service';
import { CreateFeedbackDto, QueryFeedbackDto } from './dto/feedbacks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';

@Controller('feedbacks')
@UseGuards(JwtAuthGuard)
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateFeedbackDto) {
    const user = req.user as JwtUser;
    return this.feedbacksService.create(user.id, dto);
  }

  @Get('me')
  async getMyFeedbacks(@Req() req: any) {
    const user = req.user as JwtUser;
    return this.feedbacksService.findMyFeedbacks(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAll(@Query() query: QueryFeedbackDto) {
    return this.feedbacksService.findAll(query);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async remove(@Param('id') id: string) {
    return this.feedbacksService.remove(id);
  }
}
