/** Key for logo previews in the admin: the server resolves logos, the editor looks them up by this. */
export const iconKey = (name: string, icon?: string) => `${name.trim().toLowerCase()}|${icon?.trim().toLowerCase() ?? ""}`;
