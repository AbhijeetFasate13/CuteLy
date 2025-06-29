/* eslint-disable @typescript-eslint/no-unused-expressions */
import "dotenv/config";
import { expect } from "chai";
import { AuthService } from "../services/auth.service";
import { UserRepository } from "../repositories/user.repository";
import bcrypt from "bcryptjs";

const sinon = require("sinon");

describe("AuthService", () => {
  let authService: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userRepositoryStub: any;

  beforeEach(() => {
    authService = new AuthService();
    userRepositoryStub = sinon.createStubInstance(UserRepository);
    (
      authService as unknown as { userRepository: UserRepository }
    ).userRepository = userRepositoryStub;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("registerUser", () => {
    it("should register a new user successfully", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      const name = "Test User";

      userRepositoryStub.findByEmail.resolves(null);
      userRepositoryStub.createUser.resolves({
        id: 1,
        email,
        password: "hashedPassword",
        name,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await authService.registerUser(email, password, name);

      // Assert
      expect(result.user.email).to.equal(email);
      expect(result.user.name).to.equal(name);
      expect(result.token).to.be.a("string");
      expect(userRepositoryStub.findByEmail.calledOnceWith(email)).to.be.true;
      expect(userRepositoryStub.createUser.calledOnce).to.be.true;
    });

    it("should throw error if user already exists", async () => {
      // Arrange
      const email = "existing@example.com";
      const password = "password123";

      userRepositoryStub.findByEmail.resolves({
        id: 1,
        email,
        password: "hashedPassword",
        name: "Existing User",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      try {
        await authService.registerUser(email, password);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.equal(
          "User with this email already exists",
        );
      }
    });

    it("should hash password before storing", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";

      userRepositoryStub.findByEmail.resolves(null);
      userRepositoryStub.createUser.resolves({
        id: 1,
        email,
        password: "hashedPassword",
        name: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await authService.registerUser(email, password);

      // Assert
      const createUserCall = userRepositoryStub.createUser.getCall(0);
      const userData = createUserCall.args[0];
      expect(userData.password).to.not.equal(password);
      expect(await bcrypt.compare(password, userData.password)).to.be.true;
    });
  });

  describe("loginUser", () => {
    it("should login user with valid credentials", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 12);

      userRepositoryStub.findByEmail.resolves({
        id: 1,
        email,
        password: hashedPassword,
        name: "Test User",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await authService.loginUser(email, password);

      // Assert
      expect(result.user.email).to.equal(email);
      expect(result.token).to.be.a("string");
      expect(userRepositoryStub.findByEmail.calledOnceWith(email)).to.be.true;
    });

    it("should throw error for invalid email", async () => {
      // Arrange
      const email = "nonexistent@example.com";
      const password = "password123";

      userRepositoryStub.findByEmail.resolves(null);

      // Act & Assert
      try {
        await authService.loginUser(email, password);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.equal("Invalid email or password");
      }
    });

    it("should throw error for invalid password", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "wrongpassword";
      const hashedPassword = await bcrypt.hash("correctpassword", 12);

      userRepositoryStub.findByEmail.resolves({
        id: 1,
        email,
        password: hashedPassword,
        name: "Test User",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      try {
        await authService.loginUser(email, password);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.equal("Invalid email or password");
      }
    });

    it("should throw error for inactive user", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 12);

      userRepositoryStub.findByEmail.resolves({
        id: 1,
        email,
        password: hashedPassword,
        name: "Test User",
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      try {
        await authService.loginUser(email, password);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.equal("Account is deactivated");
      }
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      // Arrange
      const userId = 1;
      const currentPassword = "oldpassword";
      const newPassword = "newpassword123";
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 12);

      userRepositoryStub.findById.resolves({
        id: userId,
        email: "test@example.com",
        password: hashedCurrentPassword,
        name: "Test User",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await authService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );

      // Assert
      expect(result.message).to.equal("Password updated successfully");
      expect(userRepositoryStub.updateUser.calledOnce).to.be.true;

      const updateCall = userRepositoryStub.updateUser.getCall(0);
      const updateData = updateCall.args[1];
      expect(updateData.password).to.exist;
      expect(await bcrypt.compare(newPassword, updateData.password!)).to.be
        .true;
    });

    it("should throw error for incorrect current password", async () => {
      // Arrange
      const userId = 1;
      const currentPassword = "wrongpassword";
      const newPassword = "newpassword123";
      const hashedCurrentPassword = await bcrypt.hash("correctpassword", 12);

      userRepositoryStub.findById.resolves({
        id: userId,
        email: "test@example.com",
        password: hashedCurrentPassword,
        name: "Test User",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      try {
        await authService.changePassword(userId, currentPassword, newPassword);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.equal(
          "Current password is incorrect",
        );
      }
    });
  });

  describe("updateProfile", () => {
    it("should update user profile successfully", async () => {
      // Arrange
      const userId = 1;
      const newName = "Updated Name";

      userRepositoryStub.findById.resolves({
        id: userId,
        email: "test@example.com",
        password: "hashedPassword",
        name: "Old Name",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      userRepositoryStub.updateUser.resolves({
        id: userId,
        email: "test@example.com",
        name: newName,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        password: "hashedPassword",
      });

      // Act
      const result = await authService.updateProfile(userId, newName);

      // Assert
      expect(result.user.name).to.equal(newName);
      expect(
        userRepositoryStub.updateUser.calledOnceWith(userId, { name: newName }),
      ).to.be.true;
    });
  });

  describe("getUserProfile", () => {
    it("should return user profile without password", async () => {
      // Arrange
      const userId = 1;
      const user = {
        id: userId,
        email: "test@example.com",
        password: "hashedPassword",
        name: "Test User",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepositoryStub.findById.resolves(user);

      // Act
      const result = await authService.getUserProfile(userId);

      // Assert
      expect(result.id).to.equal(userId);
      expect(result.email).to.equal(user.email);
      expect(result.name).to.equal(user.name);
      expect(result.createdAt).to.equal(user.createdAt);
      expect(result).to.not.have.property("password");
    });
  });
});
