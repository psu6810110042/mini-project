import { Controller, Post, Body, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Post('register')
    async register(@Body() body) {
        // This calls the service to create a new user
        return this.authService.register(body.username, body.password);
    }

    @Post('login')
    async login(@Body() body) {
        // This verifies credentials and returns the JWT
        const user = await this.authService.validateUser(body.username, body.password);
        if (!user) {
            return { message: 'Invalid credentials' };
        }
        return this.authService.login(user);
    }
}