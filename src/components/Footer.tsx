const Footer = () => {
  return (
    <footer className="mt-auto border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-sm text-muted-foreground">
          <p>
            developed by <span className="text-primary font-medium">Ruben Araujo</span>
          </p>
          <p className="mt-2 text-xs">
            Dados fornecidos por The Movie Database (TMDb)
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;