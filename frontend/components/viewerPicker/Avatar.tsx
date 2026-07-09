"use client";

interface AvatarProps {
  user: { displayName: string; avatarUrl: string | null };
  size?: number;
  ringClassName?: string;
}

export default function Avatar({ user, size = 44, ringClassName = "ring-cyan-400/30" }: AvatarProps) {
  return user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt=""
      style={{ width: size, height: size }}
      className={`rounded-full object-cover ring-2 ${ringClassName}`}
    />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white ring-2 ${ringClassName}`}
    >
      {user.displayName[0]?.toUpperCase()}
    </div>
  );
}
