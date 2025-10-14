import bcrypt from "bcrypt";

export const hashPassword = async (password: string): Promise<string> => {
  return await hash(password);
};

export const comparePassword = async (
  password: string,
  cryptedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, cryptedPassword);
};

export const hash = async (str: string) : Promise<string> => {
  return await bcrypt.hash(str, 10);
}
