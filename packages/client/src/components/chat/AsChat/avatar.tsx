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

const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
    const result = [...arr];
    let s = seed;
    for (let i = result.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        const j = Math.abs(s) % (i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
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

    const shuffledPaths = seededShuffle(filteredPaths, seed);
    const sortedNames = [...names].sort();

    for (let i = 0; i < sortedNames.length; i++) {
        assignment.set(sortedNames[i], shuffledPaths[i % shuffledPaths.length]);
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
        if (avatarPath && role.toLowerCase() !== 'system') {
            loadAvatarComponent(avatarPath)
                .then((component) => {
                    if (component) {
                        setAvatarComponent(() => component);
                    }
                })
                .catch(console.error);
        } else {
            setAvatarComponent(null);
        }
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
