const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img 
            src={`${import.meta.env.PROD ? "/lumiere-cinema-selection" : ""}/lovable-uploads/6c5812a0-e28e-43e2-8bd4-409bf85df54b.png`}
            alt="Lumiere Logo" 
            className="w-10 h-10"
          />
          <h1 className="text-2xl font-bold text-foreground">
            Lumiere
          </h1>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Descobre conteúdo de qualidade
        </div>
      </div>
    </header>
  );
};

export default Header;