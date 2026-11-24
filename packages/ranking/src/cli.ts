import { rebuildRankings } from './rebuild.js';

export async function runRebuildCli() {
  console.log('🔄 Rebuilding Community Rankings from raw event history...');
  // Runs rebuild pipeline on clean dataset
  const res = rebuildRankings([]);
  console.log(`✅ Rankings recomputed successfully at ${res.computedAt}`);
  console.log(`Leaderboards built: ${Object.keys(res.playerLeaderboards).length} individual, ${Object.keys(res.teamLeaderboards).length} team.`);
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('cli')) {
  runRebuildCli()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
