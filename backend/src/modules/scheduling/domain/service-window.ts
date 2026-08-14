// Request service window normalization (R2 Step 7).
//
// Single canonical derivation of the interval during which a Driver + Vehicle
// are occupied by a transportation request:
//
//   ONE_WAY / MULTI_STOP:
//     serviceStartAt = scheduledPickupAt            (outbound pickup)
//     serviceEndAt   = expectedEndAt                (expected completion)
//
//   ROUND_TRIP:
//     serviceStartAt = scheduledPickupAt            (outbound pickup)
//     serviceEndAt   = expectedEndAt                (return expected completion)
//
// `expectedReturnAt` is the RETURN PICKUP time, NOT the completion time, so it
// is only used as a fallback end when `expectedEndAt` is missing (endSource =
// 'expectedReturnAt'). `estimatedDurationSeconds` (a Maps-derived estimate) is
// deliberately NOT used — R2 forbids travel-time derivation (R3's job).
//
// This is a pure function over the request's scheduling fields — no redundant
// DB columns are introduced (expected_end_at is the single additive field).

import type { TransportationRequest } from '../../transportation/entities/transportation-request.entity';

export type ServiceWindow = {
  serviceStartAt: Date;
  serviceEndAt: Date;
  complete: boolean;
  endSource: 'expectedEndAt' | 'expectedReturnAt';
};

/**
 * @param request       request entity (as persisted)
 * @param expectedEndAt optional explicit end override (used when evaluating a
 *                      DTO that has not been persisted yet)
 */
export function deriveServiceWindow(
  request: Pick<
    TransportationRequest,
    'tripType' | 'scheduledPickupAt' | 'expectedEndAt' | 'expectedReturnAt'
  >,
): ServiceWindow {
  const serviceStartAt = new Date(request.scheduledPickupAt.getTime());
  const explicitEnd = request.expectedEndAt
    ? new Date(request.expectedEndAt.getTime())
    : null;
  const returnPickup = request.expectedReturnAt
    ? new Date(request.expectedReturnAt.getTime())
    : null;

  let serviceEndAt: Date;
  let endSource: ServiceWindow['endSource'];

  if (explicitEnd) {
    serviceEndAt = explicitEnd;
    endSource = 'expectedEndAt';
  } else if (returnPickup) {
    serviceEndAt = returnPickup;
    endSource = 'expectedReturnAt';
  } else {
    return {
      serviceStartAt,
      serviceEndAt: serviceStartAt,
      complete: false,
      endSource: 'expectedEndAt',
    };
  }

  const complete = serviceEndAt.getTime() > serviceStartAt.getTime();
  return { serviceStartAt, serviceEndAt, complete, endSource };
}
