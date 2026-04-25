using System.Data;
using System.Data.Common;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace TuristickiVodic.API.Infrastructure;

public static class SeedSqlExecutor
{
    private static readonly Regex LegacyImageInsertRegex = new(
        "^INSERT INTO \"Images\"\\s*\\(\"Url\",\\s*\"AltText\",\\s*\"IsMain\",\\s*\"(?<fkColumn>[^\"]+)\",\\s*\"CreatedAt\"\\)\\s*VALUES\\s*(?<rows>.+)$",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex LegacyImageRowRegex = new(
        "\\(\\s*'(?<url>(?:''|[^'])*)'\\s*,\\s*'(?<alt>(?:''|[^'])*)'\\s*,\\s*(?<isMain>true|false)\\s*,\\s*\\(SELECT\\s+\"Id\"\\s+FROM\\s+\"(?<table>[^\"]+)\"\\s+WHERE\\s+\"Name\"\\s*=\\s*'(?<name>(?:''|[^'])*)'\\)\\s*,\\s*NOW\\(\\)\\s*\\)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static bool HasHistory(DbConnection connection)
    {
        EnsureHistoryTable(connection);

        using var command = connection.CreateCommand();
        command.CommandText = """SELECT EXISTS (SELECT 1 FROM "__SeedStatementHistory" LIMIT 1);""";
        var result = command.ExecuteScalar();
        return result is bool value && value;
    }

    public static void SyncHistory(DbConnection connection, string sql, string sourceFile)
    {
        EnsureHistoryTable(connection);

        foreach (var statement in SplitStatements(sql))
        {
            InsertHistory(connection, ComputeHash(statement), sourceFile);
        }
    }

    public static int ApplyNewStatements(DbConnection connection, string sql, string sourceFile)
    {
        EnsureHistoryTable(connection);

        var appliedCount = 0;
        var knownHashes = LoadKnownHashes(connection);

        foreach (var statement in SplitStatements(sql))
        {
            var hash = ComputeHash(statement);
            if (knownHashes.Contains(hash))
            {
                continue;
            }

            using var command = connection.CreateCommand();
            command.CommandText = statement;

            try
            {
                command.ExecuteNonQuery();
            }
            catch (DbException ex) when (TryExecuteLegacyImageInsertFallback(connection, statement, ex))
            {
                // Legacy seed image blocks can contain subqueries that resolve to NULL.
                // In that case we retry row-by-row through INSERT ... SELECT so only
                // rows with an existing linked entity are inserted.
            }

            InsertHistory(connection, hash, sourceFile);
            knownHashes.Add(hash);
            appliedCount++;
        }

        return appliedCount;
    }

    private static void EnsureHistoryTable(DbConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            CREATE TABLE IF NOT EXISTS "__SeedStatementHistory" (
                "Hash" text PRIMARY KEY,
                "SourceFile" text NOT NULL,
                "ExecutedAt" timestamp with time zone NOT NULL DEFAULT NOW()
            );
            """;
        command.ExecuteNonQuery();
    }

    private static HashSet<string> LoadKnownHashes(DbConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """SELECT "Hash" FROM "__SeedStatementHistory";""";

        using var reader = command.ExecuteReader();
        var hashes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        while (reader.Read())
        {
            hashes.Add(reader.GetString(0));
        }

        return hashes;
    }

    private static void InsertHistory(DbConnection connection, string hash, string sourceFile)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            INSERT INTO "__SeedStatementHistory" ("Hash", "SourceFile")
            VALUES (@hash, @sourceFile)
            ON CONFLICT ("Hash") DO NOTHING;
            """;

        var hashParam = command.CreateParameter();
        hashParam.ParameterName = "@hash";
        hashParam.DbType = DbType.String;
        hashParam.Value = hash;
        command.Parameters.Add(hashParam);

        var sourceParam = command.CreateParameter();
        sourceParam.ParameterName = "@sourceFile";
        sourceParam.DbType = DbType.String;
        sourceParam.Value = sourceFile;
        command.Parameters.Add(sourceParam);

        command.ExecuteNonQuery();
    }

    private static string ComputeHash(string statement)
    {
        var normalized = statement.Trim();
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(bytes);
    }

    private static bool TryExecuteLegacyImageInsertFallback(DbConnection connection, string statement, DbException ex)
    {
        if (!IsImageOnlyOneConstraintViolation(ex))
        {
            return false;
        }

        var headerMatch = LegacyImageInsertRegex.Match(statement.Trim());
        if (!headerMatch.Success)
        {
            return false;
        }

        var fkColumn = headerMatch.Groups["fkColumn"].Value;
        var rows = headerMatch.Groups["rows"].Value;
        var rowMatches = LegacyImageRowRegex.Matches(rows);

        if (rowMatches.Count == 0)
        {
            return false;
        }

        foreach (Match rowMatch in rowMatches)
        {
            var url = rowMatch.Groups["url"].Value;
            var alt = rowMatch.Groups["alt"].Value;
            var isMain = rowMatch.Groups["isMain"].Value.ToUpperInvariant();
            var table = rowMatch.Groups["table"].Value;
            var name = rowMatch.Groups["name"].Value;

            using var rowCommand = connection.CreateCommand();
            rowCommand.CommandText =
                $"""
                INSERT INTO "Images" ("Url", "AltText", "IsMain", "{fkColumn}", "CreatedAt")
                SELECT '{url}', '{alt}', {isMain}, entity."Id", NOW()
                FROM "{table}" entity
                WHERE entity."Name" = '{name}';
                """;
            rowCommand.ExecuteNonQuery();
        }

        return true;
    }

    private static bool IsImageOnlyOneConstraintViolation(DbException ex)
    {
        return ex.Message.Contains("CK_Image_OnlyOne", StringComparison.OrdinalIgnoreCase)
            || ex.Message.Contains("new row for relation \"Images\" violates check constraint", StringComparison.OrdinalIgnoreCase);
    }

    private static IReadOnlyList<string> SplitStatements(string sql)
    {
        var statements = new List<string>();
        var current = new StringBuilder();

        var inSingleQuote = false;
        var inDoubleQuote = false;
        var inLineComment = false;
        var inBlockComment = false;
        string? dollarQuoteTag = null;

        for (var i = 0; i < sql.Length; i++)
        {
            var c = sql[i];
            var next = i + 1 < sql.Length ? sql[i + 1] : '\0';

            if (inLineComment)
            {
                current.Append(c);
                if (c == '\n')
                {
                    inLineComment = false;
                }

                continue;
            }

            if (inBlockComment)
            {
                current.Append(c);
                if (c == '*' && next == '/')
                {
                    current.Append(next);
                    i++;
                    inBlockComment = false;
                }

                continue;
            }

            if (dollarQuoteTag is not null)
            {
                if (StartsWith(sql, i, dollarQuoteTag))
                {
                    current.Append(dollarQuoteTag);
                    i += dollarQuoteTag.Length - 1;
                    dollarQuoteTag = null;
                }
                else
                {
                    current.Append(c);
                }

                continue;
            }

            if (inSingleQuote)
            {
                current.Append(c);
                if (c == '\'')
                {
                    if (next == '\'')
                    {
                        current.Append(next);
                        i++;
                    }
                    else
                    {
                        inSingleQuote = false;
                    }
                }

                continue;
            }

            if (inDoubleQuote)
            {
                current.Append(c);
                if (c == '"')
                {
                    inDoubleQuote = false;
                }

                continue;
            }

            if (c == '-' && next == '-')
            {
                current.Append(c);
                current.Append(next);
                i++;
                inLineComment = true;
                continue;
            }

            if (c == '/' && next == '*')
            {
                current.Append(c);
                current.Append(next);
                i++;
                inBlockComment = true;
                continue;
            }

            if (c == '\'')
            {
                current.Append(c);
                inSingleQuote = true;
                continue;
            }

            if (c == '"')
            {
                current.Append(c);
                inDoubleQuote = true;
                continue;
            }

            if (c == '$')
            {
                var tag = TryReadDollarQuoteTag(sql, i);
                if (tag is not null)
                {
                    current.Append(tag);
                    i += tag.Length - 1;
                    dollarQuoteTag = tag;
                    continue;
                }
            }

            if (c == ';')
            {
                var statement = current.ToString().Trim();
                if (!string.IsNullOrWhiteSpace(statement))
                {
                    statements.Add(statement);
                }

                current.Clear();
                continue;
            }

            current.Append(c);
        }

        var trailingStatement = current.ToString().Trim();
        if (!string.IsNullOrWhiteSpace(trailingStatement))
        {
            statements.Add(trailingStatement);
        }

        return statements;
    }

    private static bool StartsWith(string value, int startIndex, string token)
    {
        if (startIndex + token.Length > value.Length)
        {
            return false;
        }

        for (var i = 0; i < token.Length; i++)
        {
            if (value[startIndex + i] != token[i])
            {
                return false;
            }
        }

        return true;
    }

    private static string? TryReadDollarQuoteTag(string sql, int startIndex)
    {
        if (sql[startIndex] != '$')
        {
            return null;
        }

        var endIndex = startIndex + 1;
        while (endIndex < sql.Length)
        {
            var c = sql[endIndex];
            if (c == '$')
            {
                return sql[startIndex..(endIndex + 1)];
            }

            if (!(char.IsLetterOrDigit(c) || c == '_'))
            {
                return null;
            }

            endIndex++;
        }

        return null;
    }
}
