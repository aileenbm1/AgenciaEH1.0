import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, publicSignupOpen } from './auth.service';
import { RegisterDto } from './dto/register.dto'; import { LoginDto } from './dto/login.dto';
import { EmailDto, ResetPasswordDto, TokenDto } from './dto/token.dto'; import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
@Controller('auth') export class AuthController {
 constructor(private readonly auth:AuthService){}
 private cookieOptions(){return {httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/api/v1/auth',maxAge:7*24*3600*1000};}
 private sendSession(res:Response,r:any){res.cookie('eh_refresh',r.refreshToken,this.cookieOptions());const {refreshToken,...body}=r;return body;}
 @Get('config') config(){return {publicSignup:publicSignupOpen()};}
 @Post('register') async register(@Body()d:RegisterDto,@Res({passthrough:true})r:Response){return this.sendSession(r,await this.auth.register(d));}
 @Post('login') async login(@Body()d:LoginDto,@Res({passthrough:true})r:Response){return this.sendSession(r,await this.auth.login(d));}
 @Post('refresh') async refresh(@Req()q:Request,@Res({passthrough:true})r:Response){return this.sendSession(r,await this.auth.refresh(q.cookies?.eh_refresh));}
 @UseGuards(JwtAuthGuard) @Post('logout') async logout(@Req()q:any,@Res({passthrough:true})r:Response){r.clearCookie('eh_refresh',{...this.cookieOptions(),maxAge:undefined});return this.auth.logout(q.user.sub);}
 @UseGuards(JwtAuthGuard) @Get('me') me(@Req()q:any){return this.auth.me(q.user.sub);}
 @UseGuards(JwtAuthGuard) @Patch('profile') profile(@Req()q:any,@Body()d:UpdateProfileDto){return this.auth.updateProfile(q.user.sub,d);}
 @Post('verify-email') verify(@Body()d:TokenDto){return this.auth.verifyEmail(d.token);}
 @Post('resend-verification') resend(@Body()d:EmailDto){return this.auth.resendVerification(d.email);}
 @Post('forgot-password') forgot(@Body()d:EmailDto){return this.auth.requestPasswordReset(d.email);}
 @Post('reset-password') reset(@Body()d:ResetPasswordDto){return this.auth.resetPassword(d.token,d.password);}
}
