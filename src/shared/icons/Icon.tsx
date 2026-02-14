import type { ComponentType, SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  size?: number;
}

export function Icon({ icon: SvgIcon, size = 16, width, height, ...props }: IconProps) {
  return <SvgIcon width={width ?? size} height={height ?? size} {...props} />;
}
