/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { defineRegistry } from "@json-render/react";
import { threeComponents } from "@json-render/react-three-fiber";
import { catalog } from "./catalog";
import {
  GameBox,
  GameSphere,
  GameCylinder,
  GameCone,
  GameTorus,
  GamePlane,
  GameCapsule,
  GameKnot,
  GameTetrahedron,
  GameOctahedron,
  GameDodecahedron,
  GameIcosahedron,
  GameExtrude,
  GameTube,
  GameShape,
  GameMesh,
} from "@/components/game/game-primitives";
import { GameLight } from "@/components/game/game-light";
import { Player } from "@/components/game/player";
import { GameCharacter } from "@/components/game/character";
import { SoundEmitter } from "@/components/game/sound-emitter";
import { MediaPlane } from "@/components/game/media-plane";
import { GroundPlane } from "@/components/game/ground-plane";
import { GameModel as GameModelComponent } from "@/components/game/model-wrapper";

const gameComponents = {
  GameBox: ({ props, children }) => <GameBox {...props}>{children}</GameBox>,
  GameSphere: ({ props, children }) => (
    <GameSphere {...props}>{children}</GameSphere>
  ),
  GameCylinder: ({ props, children }) => (
    <GameCylinder {...props}>{children}</GameCylinder>
  ),
  GameCone: ({ props, children }) => <GameCone {...props}>{children}</GameCone>,
  GameTorus: ({ props, children }) => (
    <GameTorus {...props}>{children}</GameTorus>
  ),
  GamePlane: ({ props, children }) => (
    <GamePlane {...props}>{children}</GamePlane>
  ),
  GameCapsule: ({ props, children }) => (
    <GameCapsule {...props}>{children}</GameCapsule>
  ),
  GameKnot: ({ props, children }) => <GameKnot {...props}>{children}</GameKnot>,
  GameTetrahedron: ({ props, children }) => (
    <GameTetrahedron {...props}>{children}</GameTetrahedron>
  ),
  GameOctahedron: ({ props, children }) => (
    <GameOctahedron {...props}>{children}</GameOctahedron>
  ),
  GameDodecahedron: ({ props, children }) => (
    <GameDodecahedron {...props}>{children}</GameDodecahedron>
  ),
  GameIcosahedron: ({ props, children }) => (
    <GameIcosahedron {...props}>{children}</GameIcosahedron>
  ),
  GameExtrude: ({ props, children }) => (
    <GameExtrude {...props}>{children}</GameExtrude>
  ),
  GameTube: ({ props, children }) => <GameTube {...props}>{children}</GameTube>,
  GameShape: ({ props, children }) => (
    <GameShape {...props}>{children}</GameShape>
  ),
  GameMesh: ({ props, children }) => <GameMesh {...props}>{children}</GameMesh>,
  GameLight: ({ props }) => <GameLight {...props} />,
  Player: ({ props }) => <Player {...props} />,
  GameCharacter: ({ props }) => <GameCharacter {...props} />,
  GameModel: ({ props }) => <GameModelComponent {...props} />,
  SoundEmitter: ({ props }) => <SoundEmitter {...props} />,
  MediaPlane: ({ props }) => <MediaPlane {...props} />,
  GroundPlane: ({ props }) => <GroundPlane {...props} />,
};

const allComponents = {
  ...threeComponents,
  ...gameComponents,
};

export const { registry } = defineRegistry(catalog, {
  components: allComponents,
});

export { catalog };
