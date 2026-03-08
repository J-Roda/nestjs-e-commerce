import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  password: string;
}
