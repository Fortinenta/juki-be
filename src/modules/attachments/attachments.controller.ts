import { Controller, Get, Param, Req, UseGuards, NotFoundException, StreamableFile } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtUser } from '../auth/types/jwt-user.type';
import { createReadStream, existsSync } from 'fs';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get('me')
  async getMyAttachments(@Req() req: any) {
    const user = req.user as JwtUser;
    return this.attachmentsService.findAllMyAttachments(user.id);
  }

  @Get(':id/download')
  async downloadMyAttachment(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const user = req.user as JwtUser;
    const fileData = await this.attachmentsService.findOneForDownload(id, user.id);

    if (!existsSync(fileData.path)) {
      throw new NotFoundException('File not found on server');
    }

    const file = createReadStream(fileData.path);
    return new StreamableFile(file, {
      type: fileData.mimeType,
      disposition: `attachment; filename="${fileData.filename}"`,
    });
  }

  @Get(':id/preview')
  async previewMyAttachment(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const user = req.user as JwtUser;
    const fileData = await this.attachmentsService.findOneForDownload(id, user.id);

    if (!existsSync(fileData.path)) {
      throw new NotFoundException('File not found on server');
    }

    const file = createReadStream(fileData.path);
    return new StreamableFile(file, {
      type: fileData.mimeType,
      disposition: `inline; filename="${fileData.filename}"`,
    });
  }

  // Endpoint khusus Admin untuk download file apapun
  @Get('admin/:id/download')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async downloadAttachmentAsAdmin(
    @Param('id') id: string,
  ) {
    const fileData = await this.attachmentsService.findOneForAdminDownload(id);

    if (!existsSync(fileData.path)) {
      throw new NotFoundException('File not found on server');
    }

    const file = createReadStream(fileData.path);
    return new StreamableFile(file, {
      type: fileData.mimeType,
      disposition: `attachment; filename="${fileData.filename}"`,
    });
  }

  @Get('admin/:id/preview')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async previewAttachmentAsAdmin(
    @Param('id') id: string,
  ) {
    const fileData = await this.attachmentsService.findOneForAdminDownload(id);

    if (!existsSync(fileData.path)) {
      throw new NotFoundException('File not found on server');
    }

    const file = createReadStream(fileData.path);
    return new StreamableFile(file, {
      type: fileData.mimeType,
      disposition: `inline; filename="${fileData.filename}"`,
    });
  }
}
