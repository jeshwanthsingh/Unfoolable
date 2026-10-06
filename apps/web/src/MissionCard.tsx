import {intentPreview} from './presentation.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
export function MissionCard({mission,onOpen}:{mission:Mission;onOpen:()=>void}){
 return <article className="mission-card" data-mission-id={mission.id}>
  <p className="mission-intent">{intentPreview(mission.originalIntent)}</p>
  <div className="mission-meta"><span className="draft-badge">{mission.phase}</span><time dateTime={mission.createdAt}>{new Date(mission.createdAt).toLocaleString()}</time></div>
  <button className="secondary-button" onClick={onOpen}>Open Mission</button>
 </article>;
}
