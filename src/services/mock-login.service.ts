import type { LoginResponse, LoginRequest } from './login.service';

// Mock de usuarios para pruebas
const MOCK_USERS: Record<string, { password: string; user: LoginResponse }> = {
  'admin@test.com': {
    password: 'admin123',
    user: {
      id: 1,
      nombre: 'Administrador',
      correo: 'admin@test.com',
      rol: 'Administrador'
    }
  },
  'empleado@test.com': {
    password: 'emp123',
    user: {
      id: 2,
      nombre: 'Juan Pérez',
      correo: 'empleado@test.com',
      rol: 'Empleado'
    }
  },
  'usuario@test.com': {
    password: '123456',
    user: {
      id: 3,
      nombre: 'María González',
      correo: 'usuario@test.com',
      rol: 'Usuario'
    }
  }
};

export const MockLoginAPI = {
  async login(input: LoginRequest): Promise<LoginResponse> {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser = MOCK_USERS[input.correo.toLowerCase()];
    
    if (!mockUser) {
      throw new Error('Usuario no encontrado');
    }
    
    if (mockUser.password !== input.password) {
      throw new Error('Contraseña incorrecta');
    }
    
    return mockUser.user;
  }
};