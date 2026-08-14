import { IsNumber, Min, Max, IsEnum } from 'class-validator';

export type TravelMode = 'car' | 'pedestrian' | 'bicycle';

export class RouteRequestDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  originLatitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  originLongitude!: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  destinationLatitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  destinationLongitude!: number;

  @IsEnum(['car', 'pedestrian', 'bicycle'])
  travelMode?: TravelMode;
}
