export interface SitumPathNode { id: number, floorId: number, x: number, y: number }
export type SitumPathLinkOrigin = 'both' | 'source' | 'target'
export interface SitumPathLink { source: number, target: number, origin: SitumPathLinkOrigin, tags: string[], accessible: boolean }
export interface SitumPath { nodes: SitumPathNode[], links: SitumPathLink[] }
export interface SitumPathsResponse { paths: SitumPath[] }
