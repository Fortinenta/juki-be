import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTrainingDto,
  UpdateTrainingDto,
  QueryAdminTrainingsDto,
  TrainingAttendanceDto,
} from './dto/admin-trainings.dto';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Injectable()
export class AdminTrainingsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTrainingDto) {
    // Validasi Tanggal
    if (new Date(dto.startAt) >= new Date(dto.endAt)) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.training.create({
      data: {
        batch: dto.batch,
        title: dto.title,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        location: dto.location,
        journalCode: dto.journalCode,
        mentorName: dto.mentorName,
        quota: dto.quota,
      },
    });
  }

  async findAll(query: QueryAdminTrainingsDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { batch: { contains: query.search, mode: 'insensitive' } },
        { mentorName: { contains: query.search, mode: 'insensitive' } },
        { journalCode: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.training.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'desc' },
        include: {
          _count: {
            select: { flows: true }, // Hitung berapa participant
          },
        },
      }),
      this.prisma.training.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const training = await this.prisma.training.findUnique({
      where: { id },
      include: {
        flows: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                status: true,
                profile: {
                  select: {
                    fullName: true,
                    nim: true,
                    phone: true,
                    faculty: true,
                    major: true,
                    studyProgram: true,
                    enrollmentYear: true,
                    birthPlace: true,
                    birthDate: true,
                    gender: true,
                    ktmPath: true,
                  },
                },
              },
            },
            status: {
              select: {
                label: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!training) {
      throw new NotFoundException('Training schedule not found');
    }

    return training;
  }

  async update(id: string, dto: UpdateTrainingDto) {
    const training = await this.prisma.training.findUnique({ where: { id } });
    if (!training) throw new NotFoundException('Training not found');

    if (dto.startAt && dto.endAt) {
      if (new Date(dto.startAt) >= new Date(dto.endAt)) {
        throw new BadRequestException('End date must be after start date');
      }
    } else if (dto.startAt) {
      if (new Date(dto.startAt) >= new Date(training.endAt)) {
        throw new BadRequestException('Start date must be before end date');
      }
    } else if (dto.endAt) {
      if (new Date(training.startAt) >= new Date(dto.endAt)) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    return this.prisma.training.update({
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
    });
  }

  async delete(id: string) {
    const training = await this.prisma.training.findUnique({
      where: { id },
      include: {
        _count: {
          select: { flows: true },
        },
      },
    });

    if (!training) {
      throw new NotFoundException('Training schedule not found');
    }

    // Validasi: Tidak boleh delete jika ada participant
    if (training._count.flows > 0) {
      throw new BadRequestException(
        `Cannot delete training because it has ${training._count.flows} participant(s).`,
      );
    }

    return this.prisma.training.delete({
      where: { id },
    });
  }

  async recordAttendance(dto: TrainingAttendanceDto) {
    // 1. Validasi Training
    const training = await this.prisma.training.findUnique({
      where: { id: dto.trainingId },
    });
    if (!training) {
      throw new NotFoundException('Training schedule not found');
    }

    // 2. Cari Flow User
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId: dto.userId },
    });

    if (!flow || flow.trainingId !== dto.trainingId) {
      throw new BadRequestException('User is not registered in this training batch');
    }

    if (flow.statusCode !== TRAINING_STATUS.TRAINING_WAITING) {
      throw new BadRequestException(
        `User is currently in ${flow.statusCode} status, cannot record attendance.`,
      );
    }

    // 3. Update berdasarkan status
    if (dto.status === 'PRESENT') {
      await this.prisma.userTrainingFlow.update({
        where: { userId: dto.userId },
        data: {
          statusCode: TRAINING_STATUS.TRAINING_VERIFIED,
        },
      });
      return { message: 'User marked as PRESENT' };
    } else {
      // ABSENT
      await this.prisma.userTrainingFlow.update({
        where: { userId: dto.userId },
        data: {
          statusCode: TRAINING_STATUS.TRAINING_RESCHEDULE,
          trainingId: null, // Reset training so they can pick again
        },
      });
      return { message: 'User marked as ABSENT, status reset to reschedule' };
    }
  }
}
