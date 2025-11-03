import bcrypt from "bcrypt";

export const hash = async (str: string): Promise<string> => {
  return await bcrypt.hash(str, 10);
};

export const compare = async (firstHash: string, secondHash: string): Promise<boolean> => {
    return await bcrypt.compare(firstHash, secondHash);
}