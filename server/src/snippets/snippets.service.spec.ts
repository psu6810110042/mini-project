import { Test, TestingModule } from "@nestjs/testing";
import { SnippetsService } from "./snippets.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Snippet } from "./entities/snippet.entity";
import { Tag } from "../tags/entities/tag.entity";
import { User } from "../users/entities/user.entity";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { Repository } from "typeorm";

const mockUser = { id: 1, username: "owner", role: "USER" } as User;
const mockAdmin = { id: 99, username: "admin", role: "ADMIN" } as User;
const mockHacker = { id: 666, username: "hacker", role: "USER" } as User;

const mockTag = { id: 1, name: "typescript" } as Tag;

const mockSnippetPublic = {
  id: "1241as",
  title: "Public",
  visibility: "PUBLIC",
  author: mockUser,
  authorId: mockUser.id,
  tags: [mockTag],
  likes: [],
} as Snippet;

const mockSnippetPrivate = {
  id: "priv123",
  title: "Private",
  visibility: "PRIVATE",
  author: mockUser,
  authorId: mockUser.id,
  tags: [],
  likes: [],
} as Snippet;

describe("SnippetsService", () => {
  let service: SnippetsService;
  let snippetRepo: Repository<Snippet>;
  let tagRepo: Repository<Tag>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnippetsService,
        {
          provide: getRepositoryToken(Snippet),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SnippetsService>(SnippetsService);
    snippetRepo = module.get(getRepositoryToken(Snippet));
    tagRepo = module.get(getRepositoryToken(Tag));
  });

  describe("create", () => {
    it("should create a snippet and handle case-insensitive tags", async () => {
      const dto = {
        title: "Test",
        content: "c",
        language: "ts",
        visibility: "PUBLIC" as any,
        tags: ["TypeScript", "NESTJS"],
      };

      jest.spyOn(tagRepo, "findOneBy").mockResolvedValueOnce(mockTag);
      jest.spyOn(tagRepo, "findOneBy").mockResolvedValueOnce(null);
      jest
        .spyOn(tagRepo, "create")
        .mockReturnValue({ id: 2, name: "nestjs" } as Tag);
      jest
        .spyOn(tagRepo, "save")
        .mockResolvedValue({ id: 2, name: "nestjs" } as Tag);

      jest
        .spyOn(snippetRepo, "create")
        .mockImplementation((data) => data as Snippet);
      jest
        .spyOn(snippetRepo, "save")
        .mockResolvedValue({ id: "newId", ...dto } as any);

      const result = await service.create(dto, mockUser);

      expect(tagRepo.findOneBy).toHaveBeenCalledWith({ name: "typescript" });
      expect(tagRepo.findOneBy).toHaveBeenCalledWith({ name: "nestjs" });

      expect(snippetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          author: mockUser,
          authorId: mockUser.id,
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should throw NotFoundException if snippet does not exist", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(null);
      await expect(service.findOne("badId")).rejects.toThrow(NotFoundException);
    });

    it("should allow Guest to view PUBLIC snippet", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(mockSnippetPublic);
      const result = await service.findOne("pub123", null);
      expect(result).toEqual(mockSnippetPublic);
    });

    it("should BLOCK Guest from viewing PRIVATE snippet", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(mockSnippetPrivate);

      await expect(service.findOne("priv123", null)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should BLOCK Hacker from viewing PRIVATE snippet", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(mockSnippetPrivate);
      await expect(service.findOne("priv123", mockHacker)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should ALLOW Owner to view PRIVATE snippet", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(mockSnippetPrivate);
      const result = await service.findOne("priv123", mockUser);
      expect(result).toEqual(mockSnippetPrivate);
    });

    it("should ALLOW Admin to view PRIVATE snippet", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(mockSnippetPrivate);
      const result = await service.findOne("priv123", mockAdmin);
      expect(result).toEqual(mockSnippetPrivate);
    });
  });

  describe("findAll", () => {
    it("should return everything for ADMIN", async () => {
      jest
        .spyOn(snippetRepo, "find")
        .mockResolvedValue([mockSnippetPublic, mockSnippetPrivate]);
      await service.findAll(mockAdmin);
      expect(snippetRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: "DESC" } }),
      );
    });

    it("should return PUBLIC + OWN for User", async () => {
      await service.findAll(mockUser);
      expect(snippetRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [{ visibility: "PUBLIC" }, { author: { id: mockUser.id } }],
        }),
      );
    });

    it("should return only PUBLIC for Guest", async () => {
      await service.findAll(null);
      expect(snippetRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { visibility: "PUBLIC" },
        }),
      );
    });
  });

  describe("update", () => {
    it("should BLOCK Hacker from updating", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(mockSnippetPublic);

      await expect(
        service.update("pub123", { title: "Hacked" }, mockHacker),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should ALLOW Admin to update", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(mockSnippetPublic);
      jest.spyOn(snippetRepo, "save").mockResolvedValue(mockSnippetPublic);

      await service.update("pub123", { title: "Admin Edit" }, mockAdmin);
      expect(snippetRepo.save).toHaveBeenCalled();
    });

    it("should update tags if provided in DTO", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(mockSnippetPublic);
      jest.spyOn(tagRepo, "findOneBy").mockResolvedValue(mockTag);
      jest.spyOn(snippetRepo, "save").mockResolvedValue(mockSnippetPublic);

      await service.update("pub123", { tags: ["TypeScript"] }, mockUser);

      expect(tagRepo.findOneBy).toHaveBeenCalledWith({ name: "typescript" });
    });
  });

  describe("remove", () => {
    it("should BLOCK Hacker from deleting", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(mockSnippetPublic);

      await expect(service.remove("pub123", mockHacker)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should ALLOW Owner to delete", async () => {
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(mockSnippetPublic);
      jest.spyOn(snippetRepo, "remove").mockResolvedValue(mockSnippetPublic);

      await service.remove("pub123", mockUser);
      expect(snippetRepo.remove).toHaveBeenCalledWith(mockSnippetPublic);
    });
  });

  describe("toggleLike", () => {
    it("should ADD like if not present", async () => {
      const snippetNoLikes = { ...mockSnippetPublic, likes: [] };
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(snippetNoLikes);
      jest
        .spyOn(snippetRepo, "save")
        .mockImplementation(async (s) => s as Snippet);

      const result = await service.toggleLike("pub123", mockUser);

      expect(result.likes).toHaveLength(1);
      expect(result.likes[0]).toEqual(mockUser);
    });

    it("should REMOVE like if already present", async () => {
      const snippetWithLike = { ...mockSnippetPublic, likes: [mockUser] };
      jest.spyOn(snippetRepo, "findOne").mockResolvedValue(snippetWithLike);
      jest
        .spyOn(snippetRepo, "save")
        .mockImplementation(async (s) => s as Snippet);

      const result = await service.toggleLike("pub123", mockUser);

      expect(result.likes).toHaveLength(0);
    });
  });
});
