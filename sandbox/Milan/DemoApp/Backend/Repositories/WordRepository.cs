using Npgsql;

public class WordRepository
{
  public List<Word> GetAll()
  {
    var list = new List<Word>();

    using var conn = DbConnectionSingleton.Instance.GetConnection();
    conn.Open();

    var cmd = new NpgsqlCommand("SELECT id, text FROM words", conn);
    var reader = cmd.ExecuteReader();

    while (reader.Read())
    {
      list.Add(new Word
      {
        Id = reader.GetInt32(0),
        Text = reader.GetString(1)
      });
    }

    return list;
  }

  public void Add(string text)
  {
    using var conn = DbConnectionSingleton.Instance.GetConnection();
    conn.Open();

    var cmd = new NpgsqlCommand("INSERT INTO words(text) VALUES (@text)", conn);
    cmd.Parameters.AddWithValue("text", text);
    cmd.ExecuteNonQuery();
  }

  public void Delete(int id)
  {
    using var conn = DbConnectionSingleton.Instance.GetConnection();
    conn.Open();

    var cmd = new NpgsqlCommand("DELETE FROM words WHERE id=@id", conn);
    cmd.Parameters.AddWithValue("id", id);
    cmd.ExecuteNonQuery();
  }

  public void Update(int id, string text)
  {
    using var conn = DbConnectionSingleton.Instance.GetConnection();
    conn.Open();

    var cmd = new NpgsqlCommand("UPDATE words SET text=@text WHERE id=@id", conn);
    cmd.Parameters.AddWithValue("text", text);
    cmd.Parameters.AddWithValue("id", id);
    cmd.ExecuteNonQuery();
  }
}