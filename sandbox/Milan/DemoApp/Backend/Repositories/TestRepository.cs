using Npgsql;

public class TestRepository
{
  public List<string> GetMessages()
  {
    var messages = new List<string>();

    using var conn = DbConnectionSingleton.Instance.GetConnection();
    conn.Open();

    var cmd = new NpgsqlCommand("SELECT message FROM testdata", conn);
    var reader = cmd.ExecuteReader();

    while (reader.Read())
    {
      messages.Add(reader.GetString(0));
    }

    return messages;
  }
}