using Npgsql;

public class DbConnectionSingleton
{
  private static DbConnectionSingleton? instance;
  private readonly string connectionString;

  private DbConnectionSingleton()
  {
    connectionString = "Host=localhost;Port=5432;Username=postgres;Password=1234;Database=demoapp";
  }

  public static DbConnectionSingleton Instance
  {
    get
    {
      if (instance == null)
        instance = new DbConnectionSingleton();
      return instance;
    }
  }

  public NpgsqlConnection GetConnection()
  {
    return new NpgsqlConnection(connectionString);
  }
}