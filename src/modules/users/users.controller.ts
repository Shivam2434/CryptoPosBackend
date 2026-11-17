// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/interfaces/auth-context.interface';
import { CurrentOrg } from '../../common/decorators/current-tenant.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users & Team')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Invite/Create a team member in the organization' })
  create(@CurrentOrg() orgId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all team members for the organization' })
  findAll(@CurrentOrg() orgId: string) {
    return this.usersService.findByOrganization(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team member details by ID' })
  async findById(
    @CurrentOrg() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = await this.usersService.findById(id);
    if (user.organizationId !== orgId) {
      throw new ForbiddenException('User is not in this organization');
    }
    return user;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team member role or permissions' })
  update(
    @CurrentOrg() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(orgId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Suspend team member access' })
  delete(@CurrentOrg() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.delete(orgId, id);
  }
}
