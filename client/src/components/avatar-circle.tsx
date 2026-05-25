import { avatarStyle, initials } from "@/lib/format";

export function AvatarCircle({ name, size = 36 }: { name: string; size?: number }) {
  const style = {
    ...avatarStyle(name),
    width: size,
    height: size,
    fontSize: size * 0.4,
  };
  return (
    <div
      className="inline-flex items-center justify-center rounded-full font-semibold shrink-0"
      style={style}
      data-testid={`avatar-${name}`}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
