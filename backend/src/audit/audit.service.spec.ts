import { AuditService } from './audit.service';

describe('AuditService transactional logging', () => {
  const payload = {
    actorId: 'actor',
    actorEmail: 'actor@example.com',
    action: 'approval.test',
  };

  it('uses the transaction manager repository', async () => {
    const transactionalRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const service = new AuditService({} as never);
    const manager = {
      getRepository: jest.fn(() => transactionalRepo),
    } as never;

    await service.log(payload, manager, { required: true });

    expect(transactionalRepo.create).toHaveBeenCalledWith(payload);
    expect(transactionalRepo.save).toHaveBeenCalledTimes(1);
  });

  it('rethrows required audit failures so the surrounding transaction rolls back', async () => {
    const service = new AuditService({} as never);
    const manager = {
      getRepository: () => ({
        create: (value: unknown) => value,
        save: jest.fn().mockRejectedValue(new Error('audit insert failed')),
      }),
    } as never;

    await expect(
      service.log(payload, manager, { required: true }),
    ).rejects.toThrow('audit insert failed');
  });

  it('keeps non-critical audit logging best effort', async () => {
    const repo = {
      create: (value: unknown) => value,
      save: jest.fn().mockRejectedValue(new Error('telemetry unavailable')),
    };
    const service = new AuditService(repo as never);

    await expect(service.log(payload)).resolves.toBeUndefined();
  });
});
