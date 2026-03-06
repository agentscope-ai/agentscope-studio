import { useEffect, useState } from 'react';
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

const getFilteredPaths = (avatarSet: AvatarSet): string[] => {
    if (AVATAR_PATHS.length === 0) {
        return [];
    }

    // Filter avatar paths based on avatarSet
    let filteredPaths = AVATAR_PATHS;
    if (avatarSet !== AvatarSet.RANDOM) {
        // Map avatarSet enum to folder name
        const folderName = avatarSet.toLowerCase();
        filteredPaths = AVATAR_PATHS.filter((path) =>
            path.startsWith(`${folderName}/`),
        );
    }

    // If no avatars found in the specified set, fall back to all avatars
    if (filteredPaths.length === 0) {
        filteredPaths = AVATAR_PATHS;
    }

    return filteredPaths;
};

const hashString = (str: string, seed: number): number => {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
};

export const assignUniqueAvatars = (
    names: string[],
    seed: number,
    avatarSet: AvatarSet,
): Map<string, string> => {
    const assignment = new Map<string, string>();
    const filteredPaths = getFilteredPaths(avatarSet);

    if (filteredPaths.length === 0 || names.length === 0) {
        return assignment;
    }

    const N = filteredPaths.length;
    const usedIndices = new Set<number>();

    for (const name of names) {
        const preferred = hashString(name, seed) % N;
        let index = preferred;
        while (usedIndices.has(index)) {
            index = (index + 1) % N;
            if (index === preferred) break;
        }
        usedIndices.add(index);
        assignment.set(name, filteredPaths[index]);
    }

    return assignment;
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
 * @param avatarPath - Pre-assigned avatar path from assignUniqueAvatars.
 *                             If undefined, displays initials (letter mode).
 *
 * @return The avatar JSX element.
 */
export const AsAvatar = ({
    name,
    role,
    avatarPath,
}: {
    name: string;
    role: string;
    avatarPath?: string;
}) => {
    const [AvatarComponent, setAvatarComponent] = useState<FC<
        SVGProps<SVGSVGElement>
    > | null>(null);

    useEffect(() => {
        let stale = false;
        if (avatarPath && role.toLowerCase() !== 'system') {
            loadAvatarComponent(avatarPath)
                .then((component) => {
                    if (!stale && component) {
                        setAvatarComponent(() => component);
                    }
                })
                .catch(console.error);
        } else {
            setAvatarComponent(null);
        }
        return () => {
            stale = true;
        };
    }, [role, avatarPath]);

    let avatarComponent;
    if (role.toLowerCase() === 'system') {
        avatarComponent = <SystemAvatar />;
    } else if (AvatarComponent) {
        avatarComponent = <AvatarComponent />;
    } else {
        // Fallback: Display initials
        avatarComponent = (
            <div className="flex items-center justify-center font-medium bg-primary text-white w-full h-full">
                {name.slice(0, 2).toUpperCase()}
            </div>
        );
    }

    const className =
        'flex items-center justify-center w-9 h-9 min-h-9 min-w-9 mt-0.5';
    return <Avatar className={className}>{avatarComponent}</Avatar>;
};

export enum AvatarSet {
    CHARACTER = 'character',
    RANDOM = 'random',
    POKEMON = 'pokemon',
    FAIRYTALE = 'fairytale',
    SUPERHERO = 'superhero',
    FAMILY_MEMBERS = 'family-members',
    LETTER = 'letter',
}
