// src/modules/sandbox/sandbox.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SandboxService } from './sandbox.service';
import { SimulatePaymentTxDto } from './dto/simulate-payment.dto';

@ApiTags('Sandbox & Testing')
@Controller('sandbox')
export class SandboxController {
  constructor(private sandboxService: SandboxService) {}

  @Post('simulate-payment-tx')
  @ApiOperation({
    summary:
      'Simulate blockchain transaction detection/confirmation for test payments',
  })
  simulatePaymentTx(@Body() dto: SimulatePaymentTxDto) {
    return this.sandboxService.simulatePaymentTx(dto);
  }
}
