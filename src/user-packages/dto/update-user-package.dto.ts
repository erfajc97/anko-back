import { PartialType } from '@nestjs/mapped-types';
import { CreateUserPackageDto } from './create-user-package.dto';

export class UpdateUserPackageDto extends PartialType(CreateUserPackageDto) {}
