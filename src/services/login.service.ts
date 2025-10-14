import { API_ROOT, handleJSON } from "./http";

export type LoginResponse = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

export type LoginRequest = {
  correo: string;
  password: string;
};

const API = `${API_ROOT}/login`;

export const LoginAPI = {
  async login(input: LoginRequest): Promise<LoginResponse> {
    const raw = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Correo: input.correo, Password: input.password }),
    }).then(r => handleJSON<any>(r));

    return {
      id: Number(raw.Id ?? raw.id ?? 0),
      nombre: String(raw.Nombre ?? raw.nombre ?? ""),
      correo: String(raw.Correo ?? raw.correo ?? ""),
      rol: String(raw.Rol ?? raw.rol ?? ""),
    };
  },
};
