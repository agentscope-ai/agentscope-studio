import { ReactNode, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar.tsx';
import SystemAvatar from '@/assets/svgs/avatar-system.svg?react';
import { FC, SVGProps } from 'react';

// Use Vite import.meta.glob to dynamically import all avatar SVG files.
// Note: The glob pattern must be a static string and use a path relative to the current file.
const avatarModules = import.meta.glob<{
    default: FC<SVGProps<SVGSVGElement>>;
}>('../../../assets/svgs/avatar/**/*.svg', { query: '?react', eager: false });

// Obtain a list of all avatar file paths
const AVATAR_PATHS = Object.keys(avatarModules)
    .map((path) => {
        // Extract the part relative to avatar/ from the path
        // e.g., '../../../assets/svgs/avatar/fairytale/001-frog.svg' -> 'fairytale/001-frog'
        const match = path.match(/\/avatar\/(.+)\.svg$/);
        return match ? match[1] : '';
    })
    .filter(Boolean);

/*
 * Simple hash function to convert a string to a number
 *
 * @param str - The input string to hash.
 * @param seed - The seed value for the hash function.
 *
 * @return A non-negative integer hash of the input string.
 */
const hashString = (str: string, seed: number): number => {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

/*
 * Get avatar path based on the hash of the name
 *
 * @param name - The name to hash for avatar selection.
 * @param seed - The seed value for the hash function.
 *
 * @return The selected avatar path.
 */
const getAvatarPathByName = (name: string, seed: number): string => {
    if (AVATAR_PATHS.length === 0) {
        return '';
    }
    const hash = hashString(name, seed);
    const index = hash % AVATAR_PATHS.length;
    return AVATAR_PATHS[index];
};

/*
 * Load the avatar SVG component dynamically based on the given path.
 *
 * @param path - The relative path of the avatar SVG file.
 *
 * @return The SVG component or null if not found.
 */
const loadAvatarComponent = async (
    path: string,
): Promise<FC<SVGProps<SVGSVGElement>> | null> => {
    if (!path) {
        return null;
    }

    const fullPath = `../../../assets/svgs/avatar/${path}.svg`;
    const loader = avatarModules[fullPath];
    if (!loader) {
        return null;
    }
    const module = await loader();
    return module.default;
};

/*
 * Avatar component that displays different avatars based on user role and settings.
 *
 * @param name - The name of the user.
 * @param role - The role of the user (e.g., 'system', 'user').
 * @param randomAvatar - Whether to use a random avatar or not.
 * @param seed - The seed value for random avatar selection.
 * @param renderAvatar - A render function for custom avatar rendering.
 *
 * @return The avatar JSX element.
 */
export const AsAvatar = ({
    name,
    role,
    randomAvatar,
    seed,
    renderAvatar,
}: {
    name: string;
    role: string;
    randomAvatar: boolean;
    seed: number;
    renderAvatar?: (name: string, role: string) => ReactNode | null;
}) => {
    const [AvatarComponent, setAvatarComponent] = useState<FC<
        SVGProps<SVGSVGElement>
    > | null>(null);

    useEffect(() => {
        if (randomAvatar && role.toLowerCase() !== 'system') {
            const avatarPath = getAvatarPathByName(name, seed);
            if (avatarPath) {
                loadAvatarComponent(avatarPath)
                    .then((component) => {
                        if (component) {
                            setAvatarComponent(() => component);
                        }
                    })
                    .catch(console.error);
            }
        }
    }, [name, role, randomAvatar, seed]);

    let avatarComponent;
    if (renderAvatar) {
        const customAvatar = renderAvatar(name, role);
        if (customAvatar) {
            avatarComponent = customAvatar;
        }
    }

    if (!avatarComponent) {
        if (role.toLowerCase() === 'system') {
            avatarComponent = <SystemAvatar />;
        } else if (randomAvatar && AvatarComponent) {
            avatarComponent = <AvatarComponent />;
        } else {
            avatarComponent = (
                <div className="flex items-center justify-center font-medium bg-primary text-white w-full h-full">
                    {name.slice(0, 2).toUpperCase()}
                </div>
            );
        }
    }

    const className =
        'flex items-center justify-center w-9 h-9 min-h-9 min-w-9 mt-0.5';
    return <Avatar className={className}>{avatarComponent}</Avatar>;
};
