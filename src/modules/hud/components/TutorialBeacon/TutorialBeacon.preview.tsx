import { TutorialBeacon } from './TutorialBeacon';

export const tutorialBeaconPreview = () => ({
  default: (
    <div className="flex gap-4 p-8">
      <TutorialBeacon
        id="map-info"
        title="The Map & Movement"
        description={
          <ul className="list-disc pl-4 space-y-1">
            <li>Click an army to select it, then click an adjacent island to move.</li>
            <li>Move onto Resource Islands and click Position to gather resources automatically every turn.</li>
            <li>Move onto occupied islands or monsters to initiate Combat!</li>
          </ul>
        }
        side="right"
      />

      <TutorialBeacon
        id="player-info"
        title="Player Information & Goal"
        description="This section shows your current resources, VP, and the Victory Point goal to win the game. Gather resources by positioning armies and spend them in the Shop!"
        side="bottom"
      />
    </div>
  ),

  withCustomClass: (
    <TutorialBeacon
      id="custom"
      title="Custom Styled"
      description="This beacon has a custom class applied."
      className="ring-2 ring-yellow-500"
    />
  ),
});
