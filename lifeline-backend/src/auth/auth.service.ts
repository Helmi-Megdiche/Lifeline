import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../schemas/user.schema';
import { RegisterUserDto, LoginUserDto } from '../dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerUserDto: RegisterUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);
    const newUser = new this.userModel({
      username: registerUserDto.username,
      password: hashedPassword,
    });
    return newUser.save();
  }

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string; user: { id: string; username: string } }> {
    const user = await this.userModel.findOne({ username: loginUserDto.username });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginUserDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username, sub: user._id };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: (user._id as any).toString(), username: user.username },
    };
  }

  async validateUser(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }
}
