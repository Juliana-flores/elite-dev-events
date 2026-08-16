import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/enums/user-role.enum';
import { EventStatus } from './enums/event-status.enum';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { OrganizerEventsController } from './organizer-events.controller';

describe('EventsController and OrganizerEventsController', () => {
  let eventsController: EventsController;
  let organizerEventsController: OrganizerEventsController;
  let eventsService: EventsService;

  const mockOrganizerUser: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Organizer One',
    email: 'organizer1@elite.dev',
    role: UserRole.ORGANIZER,
  };

  const mockEventResponse = {
    id: 'event-uuid',
    organizerId: mockOrganizerUser.id,
    externalCatalogId: '157336',
    title: 'Interstellar',
    description: 'A team of explorers...',
    imageUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    startsAt: new Date(),
    location: 'Cine Elite',
    capacity: 120,
    price: '45.90',
    status: EventStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEventsService = {
    create: jest.fn(),
    updateDraft: jest.fn(),
    publish: jest.fn(),
    findOrganizerEvents: jest.fn(),
    findPublicEvents: jest.fn(),
    findPublicEventById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController, OrganizerEventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    eventsController = module.get<EventsController>(EventsController);
    organizerEventsController = module.get<OrganizerEventsController>(
      OrganizerEventsController,
    );
    eventsService = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(eventsController).toBeDefined();
    expect(organizerEventsController).toBeDefined();
    expect(eventsService).toBeDefined();
  });

  it('should create an event', async () => {
    mockEventsService.create.mockResolvedValue(mockEventResponse);

    const dto = {
      externalCatalogId: '157336',
      title: 'Interstellar',
      startsAt: new Date().toISOString(),
      location: 'Cine Elite',
      capacity: 120,
      price: '45.90',
    };

    const result = await eventsController.create(mockOrganizerUser, dto);

    expect(mockEventsService.create).toHaveBeenCalledWith(
      mockOrganizerUser.id,
      dto,
    );
    expect(result).toEqual(mockEventResponse);
  });

  it('should update a draft event', async () => {
    mockEventsService.updateDraft.mockResolvedValue({
      ...mockEventResponse,
      location: 'New Location',
    });

    const result = await eventsController.update(
      mockOrganizerUser,
      'event-uuid',
      { location: 'New Location' },
    );

    expect(mockEventsService.updateDraft).toHaveBeenCalledWith(
      mockOrganizerUser.id,
      'event-uuid',
      { location: 'New Location' },
    );
    expect(result.location).toBe('New Location');
  });

  it('should publish an event', async () => {
    const publishResponse = {
      id: 'event-uuid',
      status: EventStatus.PUBLISHED,
      published: true,
    };
    mockEventsService.publish.mockResolvedValue(publishResponse);

    const result = await eventsController.publish(
      mockOrganizerUser,
      'event-uuid',
    );

    expect(mockEventsService.publish).toHaveBeenCalledWith(
      mockOrganizerUser.id,
      'event-uuid',
    );
    expect(result).toEqual(publishResponse);
  });

  it('should find public events', async () => {
    const publicList = {
      items: [mockEventResponse],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    };
    mockEventsService.findPublicEvents.mockResolvedValue(publicList);

    const result = await eventsController.findPublicEvents({
      search: 'interstellar',
      page: 1,
      limit: 20,
    });

    expect(mockEventsService.findPublicEvents).toHaveBeenCalledWith({
      search: 'interstellar',
      page: 1,
      limit: 20,
    });
    expect(result).toEqual(publicList);
  });

  it('should find organizer events', async () => {
    const organizerList = {
      items: [mockEventResponse],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    };
    mockEventsService.findOrganizerEvents.mockResolvedValue(organizerList);

    const result = await organizerEventsController.findOrganizerEvents(
      mockOrganizerUser,
      { page: 1, limit: 20 },
    );

    expect(mockEventsService.findOrganizerEvents).toHaveBeenCalledWith(
      mockOrganizerUser.id,
      { page: 1, limit: 20 },
    );
    expect(result).toEqual(organizerList);
  });
});
