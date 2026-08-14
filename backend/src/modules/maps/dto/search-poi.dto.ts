import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const VALID_POI_CATEGORIES = [
  'fuel',
  'restaurant',
  'cafe',
  'hospital',
  'pharmacy',
  'school',
  'police',
  'atm',
  'place_of_worship',
  'parking',
  'toilets',
  'hotel',
  'fire_station',
] as const;

export type PoiCategory = (typeof VALID_POI_CATEGORIES)[number];

export { VALID_POI_CATEGORIES };

export class SearchPoiDto {
  @IsLatitude()
  @Type(() => Number)
  latitude!: number;

  @IsLongitude()
  @Type(() => Number)
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  @Type(() => Number)
  radius?: number = 5000;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .filter((c) => VALID_POI_CATEGORIES.includes(c as PoiCategory));
    }
    if (Array.isArray(value)) {
      return value.filter((c) =>
        VALID_POI_CATEGORIES.includes(c as PoiCategory),
      );
    }
    return [...VALID_POI_CATEGORIES] as PoiCategory[];
  })
  categories?: PoiCategory[] = [...VALID_POI_CATEGORIES];
}
