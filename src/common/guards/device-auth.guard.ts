// src/common/guards/device-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { DevicesService } from '../../modules/devices/devices.service';
import { AuthContext } from '../interfaces/auth-context.interface';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private devicesService: DevicesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceToken = request.headers['x-device-token'];

    if (!deviceToken || typeof deviceToken !== 'string') {
      throw new UnauthorizedException(
        'Device token is missing in X-Device-Token header',
      );
    }

    try {
      const device = await this.devicesService.validateDeviceToken(
        deviceToken.trim(),
      );
      const authContext: AuthContext = {
        organizationId: device.organizationId,
        locationId: device.locationId,
        deviceId: device.id,
        environment: 'live',
        scopes: ['payments:read', 'payments:write', 'devices:read'],
        authType: 'device',
      };

      request.auth = authContext;
      request.user = authContext;
      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Invalid device token');
    }
  }
}
