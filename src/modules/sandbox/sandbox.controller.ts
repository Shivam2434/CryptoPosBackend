// src/modules/sandbox/sandbox.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SandboxService } from './sandbox.service';
import { SimulatePaymentTxDto } from './dto/simulate-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAuth } from '../../common/decorators/current-tenant.decorator';
import type { AuthContext } from '../../common/interfaces/auth-context.interface';

@ApiTags('Sandbox & Testing')
@Controller('sandbox')
export class SandboxController {
  constructor(private sandboxService: SandboxService) {}

  @Post('simulate-payment-tx')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Simulate blockchain transaction detection/confirmation for TEST payments only',
  })
  simulatePaymentTx(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: SimulatePaymentTxDto,
  ) {
    return this.sandboxService.simulatePaymentTx(dto, auth);
  }
}
