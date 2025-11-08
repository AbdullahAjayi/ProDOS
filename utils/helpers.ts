export const delay = async (min: number, max: number) => {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(res => setTimeout(res, ms));
};
