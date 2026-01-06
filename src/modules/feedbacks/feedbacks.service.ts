import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeedbackDto, QueryFeedbackDto } from './dto/feedbacks.dto';
import { Feedback } from '@prisma/client';

@Injectable()
export class FeedbacksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto): Promise<Feedback> {
    return this.prisma.feedback.create({
      data: {
        userId,
        message: dto.message,
      },
    });
  }

  async findMyFeedbacks(userId: string): Promise<Feedback[]> {
    return this.prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(query: QueryFeedbackDto): Promise<{ data: Feedback[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.feedback.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.feedback.count(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
