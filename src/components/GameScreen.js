// 在 GameScreen.js 裡面
// ...
return (
  <div>
    {/* ... 故事内容 ... */}
    <GameControls 
      saveGameData={props.saveGameData}
      saveCount={props.saveCount}
      maxSaveLimit={props.maxSaveLimit}
      loadCount={props.loadCount}
      maxLoadLimit={props.maxLoadLimit}
    />
  </div>
)
