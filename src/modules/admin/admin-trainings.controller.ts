import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AdminTrainingsService } from './admin-trainings.service';
import { CreateTrainingDto, UpdateTrainingDto, QueryAdminTrainingsDto, TrainingAttendanceDto } from './dto/admin-trainings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/trainings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminTrainingsController {
  constructor(private readonly service: AdminTrainingsService) {}

  @Post('attendance')
  async recordAttendance(@Body() dto: TrainingAttendanceDto, @Req() req: any) {
    return this.service.recordAttendance(dto, req.user.id);
  }

  @Post()
  async create(@Body() dto: CreateTrainingDto) {
    return this.service.create(dto);
  }

  @Get()
  async findAll(@Query() query: QueryAdminTrainingsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTrainingDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
