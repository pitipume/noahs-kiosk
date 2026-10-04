import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// Validation rules live on the request class (≈ FluentValidation rules).
// The global ValidationPipe runs them before the controller is called.

export class PlaceOrderLineRequest {
  @IsInt()
  @Min(1)
  menuItemId!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  quantity!: number;
}

export class PlaceOrderRequest {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PlaceOrderLineRequest) // tells the pipe which class to validate each line as
  lines!: PlaceOrderLineRequest[];
}
