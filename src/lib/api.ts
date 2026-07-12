import axios from "axios";

export const api = axios.create();

export type ApiError = {
  error: string;
};

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.error ?? error.message ?? "Something went wrong.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}