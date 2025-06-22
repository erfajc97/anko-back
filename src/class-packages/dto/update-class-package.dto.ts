import { PartialType } from '@nestjs/mapped-types';
import { CreateClassPackageDto } from './create-class-package.dto';

export class UpdateClassPackageDto extends PartialType(CreateClassPackageDto) {}
