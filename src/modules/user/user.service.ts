import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { FileUploadService } from '../../file-upload/file-upload.service';
import { Hash } from '../../utils/hash.util';
import { AuthService } from '../auth/auth.service';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { UserView } from './dto/response/user-default.dto';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existsEmail = await this.userRepository.findByEmail(
      createUserDto.email,
    );

    if (existsEmail) throw new ConflictException('Email already exists.');

    const hashedPassword = await Hash.generate(createUserDto.password);
    createUserDto.password = hashedPassword;

    return await this.userRepository.createUser(createUserDto);
  }

  async addFriends(userId: number, friendIds: number[]) {
    return await this.userRepository.addFriends(userId, friendIds);
  }

  async findAll() {
    return await this.userRepository.findMany({});
  }

  async findOne(id: number) {
    return await this.userRepository.findOne({ id });
  }

  async findByEmail<T>(email: string, userSelect = UserView.default<T>()) {
    return await this.userRepository.findByEmail(email, userSelect);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return await this.userRepository.update(id, updateUserDto);
  }

  async updatePassword(user: User, changePasswordDto: ChangePasswordDto) {
    await this.authService.validateUser({
      email: user.email,
      password: changePasswordDto.currentPassword,
    });

    return await this.userRepository.update(user.id, {
      password: changePasswordDto.newPassword,
    });
  }

  async remove(id: number) {
    const deleteResponse = await this.userRepository.delete(id);
    if (!deleteResponse) throw new NotFoundException('User not found');
  }

  async uploadAvatar(user: User, file: Express.Multer.File) {
    const imageUrl = await this.fileUploadService.uploadFile(file);
    return await this.userRepository.update(user.id, { avatar: imageUrl });
  }
}
