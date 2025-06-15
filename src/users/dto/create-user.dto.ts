import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
    required: true,
  })
  email: string;

  @MinLength(7, { message: 'Password must be at least 7 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}:;"'|,.<>/?])(?=.{7,})/,
    {
      message:
        'Password must include lowercase, uppercase, numbers, and symbols',
    },
  )
  @ApiProperty({
    example: 'Password123!',
    description: 'User password is required for Email and Password Strategy',
    required: true,
  })
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
  })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
  })
  lastName?: string;
}
