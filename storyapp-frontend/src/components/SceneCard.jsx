import React from 'react';
import './SceneCard.css';

const SceneCard = ({ scene, index, onPlay }) => {
  const dialogueCount = scene.dialogue?.length ?? 0;
  const speakers = [...new Set((scene.dialogue || []).map((d) => d.speaker))];
  const firstLine = scene.dialogue?.[0]?.line;

  return (
    <button type="button" className="scene-card" onClick={() => onPlay(index)}>
      <span className="scene-card__index mono">SCENE {String(index + 1).padStart(2, '0')}</span>

      <div className="scene-card__image">
        {scene.imageUrl ? (
          <img src={scene.imageUrl} alt={scene.setting || `Scene ${index + 1}`} />
        ) : (
          <div className="scene-card__image-placeholder" aria-hidden="true">🎨</div>
        )}
        <span className="scene-card__play" aria-hidden="true">▶</span>
      </div>

      <div className="scene-card__body">
        <h3 className="scene-card__setting">{scene.setting || 'Untitled setting'}</h3>
        {scene.mood && <span className="scene-card__mood">{scene.mood}</span>}

        {firstLine && <p className="scene-card__excerpt">&ldquo;{firstLine}&rdquo;</p>}

        <div className="scene-card__footer">
          <span className="scene-card__characters" title={speakers.join(', ')}>
            {speakers.slice(0, 3).join(', ')}
            {speakers.length > 3 ? ` +${speakers.length - 3}` : ''}
          </span>
          <span className="scene-card__count mono">× {dialogueCount} line{dialogueCount === 1 ? '' : 's'}</span>
        </div>
      </div>
    </button>
  );
};

export default SceneCard;
